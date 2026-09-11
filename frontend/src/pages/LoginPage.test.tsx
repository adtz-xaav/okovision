import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { en } from "../locales/en";
import { LoginPage } from "./LoginPage";
import { api } from "../lib/api";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    api: { login: vi.fn(), register: vi.fn() },
  };
});

describe("LoginPage", () => {
  it("submits credentials and reports the authenticated user", async () => {
    const onAuthenticated = vi.fn();
    vi.mocked(api.login).mockResolvedValue({ id: "1", email: "owner@example.com", role: "ADMIN" });

    render(<LoginPage t={en} onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText(en.login.email), { target: { value: "owner@example.com" } });
    fireEvent.change(screen.getByLabelText(en.login.password), { target: { value: "correct-horse-battery" } });
    fireEvent.click(screen.getByRole("button", { name: en.login.submit }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith({ id: "1", email: "owner@example.com", role: "ADMIN" }));
    expect(api.login).toHaveBeenCalledWith("owner@example.com", "correct-horse-battery");
  });

  it("shows an error message when login fails", async () => {
    const { ApiError } = await vi.importActual<typeof import("../lib/api")>("../lib/api");
    vi.mocked(api.login).mockRejectedValue(new ApiError(401, "Invalid email or password"));

    render(<LoginPage t={en} onAuthenticated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(en.login.email), { target: { value: "owner@example.com" } });
    fireEvent.change(screen.getByLabelText(en.login.password), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: en.login.submit }));

    expect(await screen.findByRole("alert")).toHaveTextContent(en.login.error);
  });
});
