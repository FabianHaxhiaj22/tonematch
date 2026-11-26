import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoPicker } from "@/features/photo/PhotoPicker";
import { MAX_PHOTO_BYTES } from "@/lib/image";
import { useFlowStore } from "@/store/flow";
import { useLocaleStore } from "@/store/locale";

const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46];
const HEIC_HEAD = [0, 0, 0, 0x18, ...[..."ftypheic"].map((c) => c.charCodeAt(0)), 0, 0, 0, 0];

function file(name: string, type: string, head: number[], size?: number) {
  const f = new File([new Uint8Array([...head, 1, 2, 3])], name, { type });
  if (size !== undefined) Object.defineProperty(f, "size", { value: size });
  return f;
}

beforeEach(() => {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:photo");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  act(() => {
    useFlowStore.setState({ photo: null });
    useLocaleStore.getState().setLocale("en");
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const input = () => screen.getByLabelText("Choose a photo") as HTMLInputElement;
const pick = (f: File) => fireEvent.change(input(), { target: { files: [f] } });

describe("PhotoPicker", () => {
  it("is a native file input labelled by the button, accepting JPEG, PNG and WebP", () => {
    render(<PhotoPicker />);
    expect(input().type).toBe("file");
    expect(input().accept).toContain("image/webp");
    expect(input().accept).not.toContain("heic");
    expect(input()).toHaveAccessibleDescription("JPG, PNG or WebP · one face · natural light");
  });

  it("keeps an accepted photo in the flow store and calls onPicked", async () => {
    const onPicked = vi.fn();
    render(<PhotoPicker onPicked={onPicked} />);
    const f = file("me.jpg", "image/jpeg", JPEG_HEAD);
    pick(f);
    await waitFor(() => expect(onPicked).toHaveBeenCalledOnce());
    expect(useFlowStore.getState().photo?.file).toBe(f);
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("explains HEIC kindly, by its bytes, even with a JPEG name", async () => {
    const onPicked = vi.fn();
    render(<PhotoPicker onPicked={onPicked} />);
    pick(file("IMG_0001.jpg", "image/jpeg", HEIC_HEAD));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/HEIC photo/));
    expect(input()).toHaveAttribute("aria-invalid", "true");
    expect(input()).toHaveAccessibleDescription(/HEIC photo/);
    expect(onPicked).not.toHaveBeenCalled();
    expect(useFlowStore.getState().photo).toBeNull();
  });

  it("rejects other formats and oversized files with their own messages", async () => {
    render(<PhotoPicker />);
    pick(file("a.gif", "image/gif", [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/can't read this file/),
    );
    pick(file("big.jpg", "image/jpeg", JPEG_HEAD, MAX_PHOTO_BYTES + 1));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("larger than 30 MB"));
    expect(useFlowStore.getState().photo).toBeNull();
  });

  it("clears the error once a valid photo is chosen", async () => {
    render(<PhotoPicker />);
    pick(file("a.heic", "", []));
    await waitFor(() => expect(screen.getByRole("alert")).not.toBeEmptyDOMElement());
    pick(file("me.jpg", "image/jpeg", JPEG_HEAD));
    await waitFor(() => expect(screen.getByRole("alert")).toBeEmptyDOMElement());
    expect(input()).not.toHaveAttribute("aria-invalid");
  });

  it("accepts a dropped photo", async () => {
    const onPicked = vi.fn();
    const { container } = render(<PhotoPicker onPicked={onPicked} />);
    const zone = container.firstElementChild!;
    const f = file("me.jpg", "image/jpeg", JPEG_HEAD);
    fireEvent.dragOver(zone, { dataTransfer: { files: [f] } });
    fireEvent.drop(zone, { dataTransfer: { files: [f] } });
    await waitFor(() => expect(onPicked).toHaveBeenCalledOnce());
    expect(useFlowStore.getState().photo?.file).toBe(f);
  });

  it("ignores an empty selection and treats an unreadable file as unsupported", async () => {
    render(<PhotoPicker />);
    fireEvent.change(input(), { target: { files: [] } });
    const broken = file("me.jpg", "image/jpeg", JPEG_HEAD);
    vi.spyOn(broken, "slice").mockImplementation(() => {
      throw new Error("read failed");
    });
    pick(broken);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/can't read this file/),
    );
  });

  it("speaks Albanian when the interface does", async () => {
    act(() => useLocaleStore.getState().setLocale("sq"));
    render(<PhotoPicker />);
    expect(screen.getByLabelText("Zgjidh një foto")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Zgjidh një foto"), {
      target: { files: [file("a.heic", "image/heic", [])] },
    });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/foto HEIC/));
  });
});
