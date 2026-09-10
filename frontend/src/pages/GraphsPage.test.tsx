import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { en } from "../locales/en";
import { GraphsPage } from "./GraphsPage";
import { api, type Graph } from "../lib/api";

vi.mock("echarts", () => ({
  init: () => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() }),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    api: { listGraphs: vi.fn(), listSensors: vi.fn(), createGraph: vi.fn(), getGraphData: vi.fn() },
  };
});

const graphA: Graph = { id: "g1", name: "Graph A", position: 0, sensors: [] };
const graphB: Graph = { id: "g2", name: "Graph B", position: 0, sensors: [] };

describe("GraphsPage", () => {
  it("selects the newly created graph instead of leaving the first one selected", async () => {
    vi.mocked(api.listGraphs).mockResolvedValueOnce([graphA]).mockResolvedValueOnce([graphA, graphB]);
    vi.mocked(api.listSensors).mockResolvedValue([]);
    vi.mocked(api.createGraph).mockResolvedValue(graphB);
    vi.mocked(api.getGraphData).mockResolvedValue({ id: "g1", name: "Graph A", series: [] });

    render(<GraphsPage t={en} isAdmin={true} />);

    const select = (await screen.findByLabelText(en.graphs.select)) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe("g1"));

    await userEvent.click(screen.getByRole("button", { name: en.graphs.add }));
    await userEvent.type(screen.getByLabelText(en.graphs.name), "Graph B");
    await userEvent.click(screen.getByRole("button", { name: en.sensors.save }));

    await waitFor(() => expect(select.value).toBe("g2"));
    expect(api.createGraph).toHaveBeenCalled();
  });
});
