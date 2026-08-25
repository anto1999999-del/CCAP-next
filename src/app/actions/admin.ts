"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { countAdmins, requireAdmin, setAdmin } from "@/lib/auth/accounts";
import {
  ORDER_STATUSES,
  setHidden,
  setStatus,
  type OrderStatus,
} from "@/lib/orders/repository";

/**
 * The back office.
 *
 * Every action here checks that the person asking is an admin, on the server,
 * on every call. Hiding a button is not access control: a form can be submitted
 * by anyone who knows the address, and these change orders and grant access.
 */

export type AdminState = { message?: string };

const ObjectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "That is not a valid id.");

const StatusSchema = z.object({
  orderId: ObjectIdSchema,
  status: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]),
});

const HideSchema = z.object({
  orderId: ObjectIdSchema,
  hidden: z.enum(["true", "false"]),
});

const AdminSchema = z.object({
  userId: ObjectIdSchema,
  isAdmin: z.enum(["true", "false"]),
});

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export async function updateOrderStatus(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  if (!(await requireAdmin())) return { message: "You are not signed in as an admin." };

  const parsed = StatusSchema.safeParse({
    orderId: field(form, "orderId"),
    status: field(form, "status"),
  });
  if (!parsed.success) return { message: "That status could not be applied." };

  await setStatus(parsed.data.orderId, parsed.data.status);
  revalidatePath("/manage-orders");
  revalidatePath("/dashboard");
  return { message: `Marked ${parsed.data.status.toLowerCase()}.` };
}

export async function toggleOrderHidden(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  if (!(await requireAdmin())) return { message: "You are not signed in as an admin." };

  const parsed = HideSchema.safeParse({
    orderId: field(form, "orderId"),
    hidden: field(form, "hidden"),
  });
  if (!parsed.success) return { message: "That order could not be changed." };

  const hidden = parsed.data.hidden === "true";
  await setHidden(parsed.data.orderId, hidden);
  revalidatePath("/manage-orders");
  revalidatePath("/dashboard");

  return {
    message: hidden
      ? "Hidden from the list and the totals. The order itself is still here."
      : "Restored to the list.",
  };
}

export async function updateUserAdmin(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();
  if (!actor) return { message: "You are not signed in as an admin." };

  const parsed = AdminSchema.safeParse({
    userId: field(form, "userId"),
    isAdmin: field(form, "isAdmin"),
  });
  if (!parsed.success) return { message: "That account could not be changed." };

  const granting = parsed.data.isAdmin === "true";

  /*
    Two guards against locking everyone out. An admin cannot remove their own
    access by accident, and the last admin cannot be removed at all: without
    this, one careless click leaves a back office nobody can open.
  */
  if (!granting && parsed.data.userId === actor.id) {
    return { message: "You cannot remove your own admin access." };
  }
  if (!granting && (await countAdmins()) <= 1) {
    return { message: "That is the only admin left. Make somebody else an admin first." };
  }

  await setAdmin(parsed.data.userId, granting);
  revalidatePath("/manage-users");

  return { message: granting ? "Admin access granted." : "Admin access removed." };
}
