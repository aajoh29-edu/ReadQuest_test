import { afterEach, expect, test, vi } from "vitest";
import { request, resolveApiBaseUrl } from "./api.js";
afterEach(()=>vi.unstubAllGlobals());
test("uses same-origin cookie and serializes answer input", async () => {
  const fetch=vi.fn().mockResolvedValue({ok:true,status:201,json:async()=>({saved:true})});vi.stubGlobal("fetch",fetch);
  expect(await request("/attempts",{method:"POST",body:{selected_index:1}})).toEqual({saved:true});
  expect(fetch).toHaveBeenCalledWith("/api/attempts",expect.objectContaining({
    credentials:"same-origin",
    body:'{"selected_index":1}',
    headers:expect.objectContaining({"X-Requested-With":"XMLHttpRequest"})
  }));
});
test("validation errors use child-friendly message", async () => {
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:false,status:422,json:async()=>({detail:[{msg:"database"}]})}));
  await expect(request("/attempts")).rejects.toThrow("Check your answers");
});
test("expired session dispatches an auth event", async () => {
  const handler=vi.fn();window.addEventListener("readquest-session-expired",handler);
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:false,status:401,json:async()=>({detail:"authentication required"})}));
  await expect(request("/children")).rejects.toThrow("authentication required");
  expect(handler).toHaveBeenCalledOnce();window.removeEventListener("readquest-session-expired",handler);
});
test("API configuration accepts same-origin paths and rejects insecure remote HTTP", () => {
  expect(resolveApiBaseUrl("/api/")).toBe("/api");
  expect(resolveApiBaseUrl("https://api.readquest.example/api")).toBe("https://api.readquest.example/api");
  expect(() => resolveApiBaseUrl("http://api.readquest.example/api")).toThrow("must use HTTPS");
});
