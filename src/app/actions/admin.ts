"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  countAdmins,
  deleteAccount,
  requireAdmin,
  setAdmin,
} from "@/lib/auth/accounts";
import { beginReset } from "@/lib/auth/reset";
import { sendEmail } from "@/lib/email";
import { orderStatusUpdate } from "@/lib/emails/orders";
import { site } from "@/lib/site";
import { setHidden, setStatus } from "@/lib/orders/repository";
import { ORDER_STATUSES } from "@/lib/orders/types";

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
  status: z.enum(ORDER_STATUSES),
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
  if (!(await requireAdmin()))
    return { message: "You are not signed in as an admin." };

  const parsed = StatusSchema.safeParse({
    orderId: field(form, "orderId"),
    status: field(form, "status"),
  });
  if (!parsed.success) return { message: "That status could not be applied." };

  const { changed, order } = await setStatus(
    parsed.data.orderId,
    parsed.data.status,
  );

  revalidatePath("/manage-orders");
  revalidatePath("/dashboard");
  revalidatePath("/orders");

  if (!order) return { message: "That order no longer exists." };

  const marked = `Marked ${parsed.data.status.toLowerCase()}.`;

  /*
    Only a real move is worth an email. Re-selecting the status an order is
    already on is a mis-click, and telling the customer their parts have been
    delivered twice reads as a mistake, because it is one.
  */
  if (!changed)
    return { message: `${marked} No change, so nobody was emailed.` };
  if (!order.customer.email) return { message: `${marked} No email on file.` };

  const sent = await sendEmail({
    to: order.customer.email,
    replyTo: site.contact.email,
    ...orderStatusUpdate(order),
  });

  /*
    The status is already saved. A mail failure is reported rather than thrown,
    so the back office never has to guess whether the change went through.
  */
  return {
    message: sent.ok
      ? `${marked} ${order.customer.email} has been told.`
      : `${marked} The customer could NOT be emailed — check the mail configuration.`,
  };
}

export async function toggleOrderHidden(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  if (!(await requireAdmin()))
    return { message: "You are not signed in as an admin." };

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
    return {
      message:
        "That is the only admin left. Make somebody else an admin first.",
    };
  }

  await setAdmin(parsed.data.userId, granting);
  revalidatePath("/manage-users");

  return {
    message: granting ? "Admin access granted." : "Admin access removed.",
  };
}

/**
 * Remove an account.
 *
 * Their orders stay. An order records money that changed hands and keeps the
 * name, email and address it was placed with, so deleting a customer must not
 * delete the sale or leave the yard unable to say who bought what.
 */
export async function deleteUser(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const actor = await requireAdmin();
  if (!actor) return { message: "You are not signed in as an admin." };

  const parsed = ObjectIdSchema.safeParse(field(form, "userId"));
  if (!parsed.success) return { message: "That account could not be removed." };

  // The same guard as removing admin: an admin cannot delete themselves, and
  // the last one cannot go at all.
  if (parsed.data === actor.id) {
    return { message: "You cannot delete your own account." };
  }
  if ((await countAdmins()) <= 1) {
    const target = parsed.data;
    const actorIsOnlyAdmin = target !== actor.id;
    if (!actorIsOnlyAdmin) {
      return { message: "That is the only admin left." };
    }
  }

  await deleteAccount(parsed.data);
  revalidatePath("/manage-users");

  return { message: "Account removed. Their orders are still here." };
}

/**
 * Send somebody a reset link.
 *
 * The admin never sees or sets the password: the link goes to the customer's
 * own inbox. An admin who can type a new password for somebody else can also
 * sign in as them afterwards.
 */
export async function sendResetLink(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  if (!(await requireAdmin())) {
    return { message: "You are not signed in as an admin." };
  }

  const email = field(form, "email").trim();
  if (!email.includes("@"))
    return { message: "That account has no email address." };

  const token = await beginReset(email);
  if (!token) return { message: "No account with that address." };

  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? site.url;
  const sent = await sendEmail({
    to: email,
    subject: `Reset your ${site.name} password`,
    text: [
      "Somebody at Central Coast Auto Parts started a password reset for you.",
      "",
      `${origin}/reset-password/${token}`,
      "",
      "The link works once and expires in an hour.",
    ].join("\n"),
  });

  return sent.ok
    ? { message: `Reset link sent to ${email}.` }
    : { message: "The email could not be sent. Check the mail configuration." };
}
