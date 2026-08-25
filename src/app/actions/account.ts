"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentAccount, updateDetails } from "@/lib/auth/accounts";
import { firstErrors, nameField } from "@/lib/auth/credentials";

/**
 * Saving a customer's own details.
 *
 * The account being changed is the one signed in, read from the session cookie.
 * It is never taken from the form: an id in a form is an id somebody can edit,
 * and editing it would let one customer rewrite another's details.
 */

export type DetailsState = {
  errors?: Record<string, string>;
  message?: string;
};

const DetailsSchema = z.object({
  name: nameField,
  phone: z.string().trim().max(40).default(""),
  address: z.string().trim().max(160).default(""),
  city: z.string().trim().max(80).default(""),
  postcode: z
    .string()
    .trim()
    .max(10)
    .refine((value) => value === "" || /^\d{3,4}$/.test(value), {
      message: "An Australian postcode is four digits.",
    })
    .default(""),
});

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export async function saveDetails(
  _previous: DetailsState,
  form: FormData,
): Promise<DetailsState> {
  const account = await currentAccount();
  if (!account) {
    return { message: "You are signed out. Sign in again to save changes." };
  }

  const parsed = DetailsSchema.safeParse({
    name: field(form, "name"),
    phone: field(form, "phone"),
    address: field(form, "address"),
    city: field(form, "city"),
    postcode: field(form, "zipcode"),
  });

  if (!parsed.success) {
    const errors = firstErrors(parsed.error);
    // The field is called zipcode in the database, and postcode to a customer.
    if (errors.postcode) errors.zipcode = errors.postcode;
    return { errors };
  }

  const { name, phone, address, city, postcode } = parsed.data;

  await updateDetails(account.id, {
    name,
    phone,
    address,
    city,
    zipcode: postcode,
  });

  revalidatePath("/my-account");
  return { message: "Saved." };
}
