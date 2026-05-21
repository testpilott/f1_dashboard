import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function DialogFixture() {
  return (
    <Dialog>
      <DialogTrigger>Open dialog</DialogTrigger>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>Driver season detail</DialogTitle>
          <DialogDescription>Shows race-by-race results.</DialogDescription>
          <DialogClose aria-label="Close dialog">Close</DialogClose>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

describe("<Dialog />", () => {
  it("opens from trigger and closes from close button", async () => {
    const user = userEvent.setup();
    render(<DialogFixture />);

    expect(screen.queryByText("Driver season detail")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open dialog/i }));
    expect(await screen.findByText("Driver season detail")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close dialog/i }));
    await waitFor(() => {
      expect(screen.queryByText("Driver season detail")).not.toBeInTheDocument();
    });
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<DialogFixture />);

    await user.click(screen.getByRole("button", { name: /open dialog/i }));
    expect(await screen.findByText("Driver season detail")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByText("Driver season detail")).not.toBeInTheDocument();
    });
  });

  it("closes on backdrop click", async () => {
    const user = userEvent.setup();
    render(<DialogFixture />);

    await user.click(screen.getByRole("button", { name: /open dialog/i }));
    expect(await screen.findByText("Driver season detail")).toBeInTheDocument();

    const backdrop = document.querySelector('[data-slot="dialog-backdrop"]') as HTMLElement | null;
    expect(backdrop).not.toBeNull();

    await user.click(backdrop!);
    await waitFor(() => {
      expect(screen.queryByText("Driver season detail")).not.toBeInTheDocument();
    });
  });
});
