import { afterEach, describe, expect, it, vi } from "vitest";

const connectedSendEvent = vi.fn(async () => ({ success: true as const, eventId: "real" }));
vi.mock("basehub/events", () => ({ sendEvent: connectedSendEvent, parseFormData: vi.fn() }));

afterEach(() => {
  delete process.env.BASEHUB_TOKEN;
  connectedSendEvent.mockClear();
});

describe("whether BaseHub is connected", () => {
  it("is not, without a token, and is with one", async () => {
    const { isBaseHubConnected } = await import("@/lib/basehub/connection");
    expect(isBaseHubConnected()).toBe(false);
    process.env.BASEHUB_TOKEN = "  ";
    expect(isBaseHubConnected()).toBe(false);
    process.env.BASEHUB_TOKEN = "bshb_pk_fake";
    expect(isBaseHubConnected()).toBe(true);
  });

  it("treats the sample keys, and none, as no repository", async () => {
    const { isSampleKey, SAMPLE_INGEST_KEY } = await import("@/lib/basehub/connection");
    expect(isSampleKey(SAMPLE_INGEST_KEY)).toBe(true);
    expect(isSampleKey("")).toBe(true);
    expect(isSampleKey("bshb_event_123:abc")).toBe(false);
  });
});

describe("sending an event", () => {
  it("drops an event for the sample keys without calling BaseHub", async () => {
    const { sendEvent } = await import("@/lib/basehub/events");
    const { SAMPLE_INGEST_KEY } = await import("@/lib/basehub/connection");
    // @ts-expect-error -- the sample key is not one of the repository's typed keys
    expect(await sendEvent(SAMPLE_INGEST_KEY, { eventType: "view" })).toEqual({ success: true, eventId: "not-connected" });
    expect(connectedSendEvent).not.toHaveBeenCalled();
  });

  it("sends a repository's event through BaseHub", async () => {
    const { sendEvent } = await import("@/lib/basehub/events");
    await sendEvent("bshb_event__1457496544:real", { eventType: "view" });
    expect(connectedSendEvent).toHaveBeenCalledWith("bshb_event__1457496544:real", { eventType: "view" });
  });
});

describe("the client and Pump", () => {
  it("answer from the sample content when BaseHub is not connected", async () => {
    const { basehub } = await import("@/lib/basehub/client");
    const data = await basehub().query({ site: { blog: { mainTitle: true } } });
    expect(data.site.blog.mainTitle).toBe("Blog");
    const { Pump } = await import("@/lib/basehub/pump");
    const rendered = await (Pump as unknown as (p: unknown) => Promise<unknown>)({
      queries: [{ site: { changelog: { title: true } } }],
      children: async ([d]: [{ site: { changelog: { title: string } } }]) => d.site.changelog.title,
    });
    expect(rendered).toBe("Changelog");
  });
});

describe("the health check", () => {
  it("answers ok and says where the content comes from", async () => {
    const { GET } = await import("@/app/api/health/route");
    expect(await GET().json()).toEqual({ ok: true, content: "sample" });
    process.env.BASEHUB_TOKEN = "bshb_pk_fake";
    expect(await GET().json()).toEqual({ ok: true, content: "basehub" });
  });
});
