import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { en } from "../locales/en";
import { HistoryPage } from "./HistoryPage";
import { api } from "../lib/api";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, api: { listSensors: vi.fn(), getReadings: vi.fn() } };
});

describe("HistoryPage", () => {
  it("prompts to configure a sensor when none exist", async () => {
    vi.mocked(api.listSensors).mockResolvedValue([]);

    render(<HistoryPage t={en} />);

    expect(await screen.findByText(en.history.noSensors)).toBeInTheDocument();
  });

  it("auto-selects the first sensor and fetches its last 7 days by default", async () => {
    vi.mocked(api.listSensors).mockResolvedValue([
      { id: "s1", key: "outdoor_temp", label: "Outdoor", unit: "°C", correction: 0, csvColumn: 0 },
    ]);
    vi.mocked(api.getReadings).mockResolvedValue([
      { timestamp: "2026-09-09T00:00:00.000Z", value: 12 },
      { timestamp: "2026-09-10T00:00:00.000Z", value: 18.5 },
    ]);

    render(<HistoryPage t={en} />);

    expect(await screen.findByText("Outdoor")).toBeInTheDocument();
    await waitFor(() => expect(api.getReadings).toHaveBeenCalledWith("s1", expect.any(String), expect.any(String)));
    expect(await screen.findByText("Between 12°C and 18.5°C over the last 7 days.")).toBeInTheDocument();
  });

  it("refetches when a different sensor is picked", async () => {
    vi.mocked(api.listSensors).mockResolvedValue([
      { id: "s1", key: "outdoor_temp", label: "Outdoor", unit: "°C", correction: 0, csvColumn: 0 },
      { id: "s2", key: "flow_temp", label: "Flow", unit: "°C", correction: 0, csvColumn: 1 },
    ]);
    vi.mocked(api.getReadings).mockResolvedValue([{ timestamp: "2026-09-10T00:00:00.000Z", value: 61 }]);

    render(<HistoryPage t={en} />);
    await screen.findByText("Outdoor");

    const { default: userEvent } = await import("@testing-library/user-event");
    await userEvent.click(screen.getByText("Flow"));

    await waitFor(() => expect(api.getReadings).toHaveBeenCalledWith("s2", expect.any(String), expect.any(String)));
  });
});
