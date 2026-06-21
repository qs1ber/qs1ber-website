import { requireAdminAuth } from "./adminAuth.js";

requireAdminAuth(() => {
  import("./admin.js");
});
