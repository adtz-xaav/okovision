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

    render(<HistoryPage t={en} language="en" />);

    expect(await screen.findByText(en.history.noSensors)).toBeInTheDocument();
  });

  it("lists sensors and prompts for a selection before fetching readings", async () => {
    vi.mocked(api.listSensors).mockResolvedValue([
      { id: "s1", key: "outdoor_temp", label: "Outdoor", unit: "°C", correction: 0, csvColumn: 0 },
    ]);

    render(<HistoryPage t={en} language="en" />);

    expect(await screen.findByText("Outdoor (°C)")).toBeInTheDocument();
    expect(screen.getByText(en.history.selectSensorPrompt)).toBeInTheDocument();
    expect(api.getReadings).not.toHaveBeenCalled();
  });

  it("fetches readings once a sensor is selected", async () => {
    vi.mocked(api.listSensors).mockResolvedValue([
      { id: "s1", key: "outdoor_temp", label: "Outdoor", unit: null, correction: 0, csvColumn: 0 },
    ]);
    vi.mocked(api.getReadings).mockResolvedValue([{ timestamp: "2026-09-09T00:00:00.000Z", value: 18.5 }]);

    render(<HistoryPage t={en} language="en" />);
    await screen.findByText("Outdoor");

    const { default: userEvent } = await import("@testing-library/user-event");
    await userEvent.selectOptions(screen.getByLabelText(en.history.sensorLabel), "s1");

    await waitFor(() => expect(api.getReadings).toHaveBeenCalled());
    expect(await screen.findByText("18.5")).toBeInTheDocument();
  });
});
