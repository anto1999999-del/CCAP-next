import { describe, expect, it } from "vitest";
import { onlyVehiclePhotos, stillOnDonorVehicle } from "./donor";
import type { PartImage } from "./types";

const photo = (type: string | null): PartImage => ({
  type,
  img: "/v1/image/m/x.jpeg",
  thumb: "/v1/image/t/x.jpeg",
});

describe("still on the donor vehicle", () => {
  it("is a part with no shelf tag", () => {
    expect(stillOnDonorVehicle({ tag: null })).toBe(true);
    expect(stillOnDonorVehicle({ tag: "" })).toBe(true);
    expect(stillOnDonorVehicle({ tag: "   " })).toBe(true);
  });

  it("is not a part that has been tagged, which means pulled and shelved", () => {
    expect(stillOnDonorVehicle({ tag: "0000019321" })).toBe(false);
  });
});

describe("only photos of the vehicle", () => {
  it("is true when no photo is of the part", () => {
    expect(onlyVehiclePhotos([photo("Vehicle"), photo("Vehicle")])).toBe(true);
    expect(onlyVehiclePhotos([photo(null)])).toBe(true);
  });

  it("is false as soon as one photo is of the part itself", () => {
    expect(onlyVehiclePhotos([photo("Vehicle"), photo("Part")])).toBe(false);
  });

  it("says nothing when there are no photos at all", () => {
    // The placeholder is not a photo of anything, so there is nothing to explain.
    expect(onlyVehiclePhotos([])).toBe(false);
  });
});
