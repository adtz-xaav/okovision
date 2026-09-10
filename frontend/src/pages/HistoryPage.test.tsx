import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { en } from "../locales/en";
import { HistoryPage } from "./HistoryPage";
import { api } from "../lib/api";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, api: { listSensors: vi.fn(), listGraphs: vi.fn(), createGraph: vi.fn(), getReadings: vi.fn() } };
});

describe("HistoryPage", () => {
  it("prompts to configure a sensor when none exist", async () => {
    vi.mocked(api.listSensors).mockResolvedValue([]);
    vi.mocked(api.listGraphs).mockResolvedValue([]);

    render(<HistoryPage t={en} isAdmin={false} />);

    expect(await screen.findByText(en.history.noSensors)).toBeInTheDocument();
  });

  it("auto-selects the first sensor and fetches its last 7 days by default", async () => {
    vi.mocked(api.listSensors).mockResolvedValue([
      { id: "s1", key: "outdoor_temp", label: "Outdoor", unit: "°C", correction: 0, csvColumn: 0 },
    ]);
    vi.mocked(api.listGraphs).mockResolvedValue([]);
    vi.mocked(api.getReadings).mockResolvedValue([
      { timestamp: "2026-09-09T00:00:00.000Z", value: 12 },
      { timestamp: "2026-09-10T00:00:00.000Z", value: 18.5 },
    ]);

    render(<HistoryPage t={en} isAdmin={false} />);

    expect(await screen.findByText("Outdoor")).toBeInTheDocument();
    await waitFor(() => expect(api.getReadings).toHaveBeenCalledWith("s1", expect.any(String), expect.any(String)));
    expect(await screen.findByText("18.5°C")).toBeInTheDocument();
  });

  it("overlays a second sensor's readings when its chip is toggled on", async () => {
    vi.mocked(api.listSensors).mockResolvedValue([
      { id: "s1", key: "outdoor_temp", label: "Outdoor", unit: "°C", correction: 0, csvColumn: 0 },
      { id: "s2", key: "flow_temp", label: "Flow", unit: "°C", correction: 0, csvColumn: 1 },
    ]);
    vi.mocked(api.listGraphs).mockResolvedValue([]);
    vi.mocked(api.getReadings).mockResolvedValue([{ timestamp: "2026-09-10T00:00:00.000Z", value: 61 }]);

    render(<HistoryPage t={en} isAdmin={false} />);
    await screen.findByText("Outdoor");

    const { default: userEvent } = await import("@testing-library/user-event");
    await userEvent.click(screen.getByText("Flow"));

    await waitFor(() => expect(api.getReadings).toHaveBeenCalledWith("s2", expect.any(String), expect.any(String)));
    await waitFor(() => expect(api.getReadings).toHaveBeenCalledWith("s1", expect.any(String), expect.any(String)));
    // "Flow" now appears both as the chip and in the chart legend row.
    await waitFor(() => expect(screen.getAllByText("Flow").length).toBeGreaterThan(1));
  });

  it("saves the current selection as a named graph for admins", async () => {
    vi.mocked(api.listSensors).mockResolvedValue([
      { id: "s1", key: "outdoor_temp", label: "Outdoor", unit: "°C", correction: 0, csvColumn: 0 },
    ]);
    vi.mocked(api.listGraphs).mockResolvedValue([]);
    vi.mocked(api.getReadings).mockResolvedValue([{ timestamp: "2026-09-10T00:00:00.000Z", value: 12 }]);
    vi.mocked(api.createGraph).mockResolvedValue({
      id: "g1",
      name: "Boiler room",
      position: 0,
      sensors: [
        {
          id: "gs1",
          sensorId: "s1",
          coefficient: 1,
          position: 0,
          sensor: { id: "s1", key: "outdoor_temp", label: "Outdoor", unit: "°C", correction: 0, csvColumn: 0 },
        },
      ],
    });
    vi.spyOn(window, "prompt").mockReturnValue("Boiler room");

    render(<HistoryPage t={en} isAdmin={true} />);
    await screen.findByText("Outdoor");

    const { default: userEvent } = await import("@testing-library/user-event");
    await userEvent.click(screen.getByText(en.history.saveView));

    await waitFor(() =>
      expect(api.createGraph).toHaveBeenCalledWith({
        name: "Boiler room",
        position: 0,
        sensors: [{ sensorId: "s1", coefficient: 1, position: 0 }],
      }),
    );
    expect(await screen.findByText("Boiler room")).toBeInTheDocument();
  });
});
