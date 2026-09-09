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
});
