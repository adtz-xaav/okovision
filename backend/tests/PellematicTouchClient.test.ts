import { afterEach, describe, expect, it, vi } from "vitest";
import { PellematicTouchClient } from "../src/boiler/PellematicTouchClient.js";

function jsonResponse(body: string, status = 200) {
  return new Response(body, { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PellematicTouchClient", () => {
  it("extracts available dates from the boiler's directory listing HTML", async () => {
    const html = `
      <html><body>
        <a href="touch_20260907.csv">touch_20260907.csv</a>
        <a href="touch_20260908.csv">touch_20260908.csv</a>
        <a href="touch_20260908.csv">touch_20260908.csv</a>
        <a href="../">../</a>
      </body></html>
    `;
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(html));
    vi.stubGlobal("fetch", fetchMock);

    const client = new PellematicTouchClient("192.168.1.50");
    const dates = await client.listAvailableDates();

    expect(dates).toEqual(["2026-09-07", "2026-09-08"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://192.168.1.50/logfiles/pelletronic/",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("fetches a given day's raw CSV text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse("09.09.2026;00:00:00;18,5"));
    vi.stubGlobal("fetch", fetchMock);

    const client = new PellematicTouchClient("192.168.1.50");
    const csv = await client.fetchDayCsv("2026-09-09");

    expect(csv).toBe("09.09.2026;00:00:00;18,5");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://192.168.1.50/logfiles/pelletronic/touch_20260909.csv",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("throws when the boiler has no log for that day", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse("Not Found", 404)),
    );
    const client = new PellematicTouchClient("192.168.1.50");
    await expect(client.fetchDayCsv("2026-01-01")).rejects.toThrow(/404/);
  });

  it("parses the boiler's own column titles, ordered by index", async () => {
    // Real-world quirk observed against a Pellematic Touch: index 0 isn't guaranteed first.
    const titlesCsv = "1;Temp. ext. instantanée\n0;T extérieure\n\n2;CF1 (Chauffage) T Dep mes\n";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(titlesCsv)));

    const client = new PellematicTouchClient("192.168.1.50");
    const titles = await client.fetchColumnTitles();

    expect(titles).toEqual(["T extérieure", "Temp. ext. instantanée", "CF1 (Chauffage) T Dep mes"]);
  });

  function loginRedirect(sessionCookie = "pksession=31320; Path=/; Max-Age=600") {
    return new Response(null, {
      status: 303,
      headers: [
        ["set-cookie", "language=en; Path=/"],
        ["set-cookie", sessionCookie],
        ["location", "/"],
      ],
    });
  }

  describe("getLiveValues", () => {
    it("logs in, then reads only the tags the boiler recognized", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(loginRedirect())
        .mockResolvedValueOnce(
          jsonResponse(
            JSON.stringify([
              { status: "OK", name: "CAPPL:LOCAL.oekomode", value: "0" },
              { status: "ERROR", name: "CAPPL:LOCAL.unknown_tag", value: "???" },
            ]),
          ),
        );
      vi.stubGlobal("fetch", fetchMock);

      const client = new PellematicTouchClient("192.168.1.89");
      const values = await client.getLiveValues("P0060B5_408AAE", "pellematiccompact", [
        "CAPPL:LOCAL.oekomode",
        "CAPPL:LOCAL.unknown_tag",
      ]);

      expect(values).toEqual({ "CAPPL:LOCAL.oekomode": "0" });

      const [loginUrl, loginInit] = fetchMock.mock.calls[0];
      expect(loginUrl).toBe("http://192.168.1.89/index.cgi");
      expect(loginInit.redirect).toBe("manual");
      expect(String(loginInit.body)).toContain("username=P0060B5_408AAE");
      expect(String(loginInit.body)).toContain("password=pellematiccompact");

      const [valuesUrl, valuesInit] = fetchMock.mock.calls[1];
      expect(valuesUrl).toBe("http://192.168.1.89/?action=get");
      expect(valuesInit.headers.Cookie).toBe("pksession=31320");
      expect(JSON.parse(valuesInit.body)).toEqual(["CAPPL:LOCAL.oekomode", "CAPPL:LOCAL.unknown_tag"]);
    });

    it("throws when the boiler rejects the login", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
      const client = new PellematicTouchClient("192.168.1.89");
      await expect(client.getLiveValues("wrong", "credentials", ["CAPPL:LOCAL.oekomode"])).rejects.toThrow(/rejected/);
    });

    it("throws when a successful-looking login carries no session cookie", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 303, headers: { location: "/" } })));
      const client = new PellematicTouchClient("192.168.1.89");
      await expect(client.getLiveValues("user", "pass", ["CAPPL:LOCAL.oekomode"])).rejects.toThrow(/session cookie/);
    });
  });

  describe("setLiveValues", () => {
    it("logs in, then posts the tag/value map to the set endpoint", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(loginRedirect()).mockResolvedValueOnce(new Response(null, { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      const client = new PellematicTouchClient("192.168.1.89");
      await client.setLiveValues("P0060B5_408AAE", "pellematiccompact", { "CAPPL:LOCAL.oekomode": "1" });

      const [setUrl, setInit] = fetchMock.mock.calls[1];
      expect(setUrl).toBe("http://192.168.1.89/?action=set");
      expect(setInit.headers.Cookie).toBe("pksession=31320");
      expect(JSON.parse(setInit.body)).toEqual({ "CAPPL:LOCAL.oekomode": "1" });
    });

    it("throws when the write request fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(loginRedirect()).mockResolvedValueOnce(new Response(null, { status: 500 })),
      );
      const client = new PellematicTouchClient("192.168.1.89");
      await expect(client.setLiveValues("user", "pass", { "CAPPL:LOCAL.oekomode": "1" })).rejects.toThrow(/500/);
    });
  });
});
