import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";
import { ApiError } from "@/lib/api-client";

const login = vi.fn();
const register = vi.fn();
vi.mock("@/providers/auth-provider", () => ({ useAuth: () => ({ login, register }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

describe("Login page", () => {
  beforeEach(() => {
    login.mockResolvedValue(undefined);
  });

  it("signs in with the typed credentials", async () => {
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "ann@x.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(login).toHaveBeenCalledWith("ann@x.com", "secret"));
  });

  it("uses the right input types so browsers and password managers behave", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });

  it("shows the server's message for a wrong password, and lets you try again", async () => {
    login.mockRejectedValueOnce(new ApiError(401, "UNAUTHORIZED", "Invalid email or password"));
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "ann@x.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.queryByText("Invalid email or password")).not.toBeInTheDocument());
  });

  it("shows a generic message for unexpected failures (never a raw error)", async () => {
    login.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "ann@x.com");
    await userEvent.type(screen.getByLabelText("Password"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Unable to sign in")).toBeInTheDocument();
    expect(screen.queryByText(/failed to fetch/i)).not.toBeInTheDocument();
  });

  it("links to registration", () => {
    render(<LoginPage />);
    expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/register");
  });
});

describe("Register page", () => {
  beforeEach(() => {
    register.mockResolvedValue(undefined);
  });

  it("creates the account with name, email and password", async () => {
    render(<RegisterPage />);
    await userEvent.type(screen.getByLabelText("Full name"), "Ann Lee");
    await userEvent.type(screen.getByLabelText("Email"), "ann@x.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: /create account|sign up|register/i }));
    await waitFor(() => expect(register).toHaveBeenCalledWith("ann@x.com", "password123", "Ann Lee"));
  });

  it("asks for a password of at least 8 characters", () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("minlength", "8");
  });

  it("shows the server's reason, e.g. an email that is already registered", async () => {
    register.mockRejectedValueOnce(new ApiError(409, "CONFLICT", "That email is already registered"));
    render(<RegisterPage />);
    await userEvent.type(screen.getByLabelText("Full name"), "Ann");
    await userEvent.type(screen.getByLabelText("Email"), "ann@x.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: /create account|sign up|register/i }));
    expect(await screen.findByText("That email is already registered")).toBeInTheDocument();
  });
});
