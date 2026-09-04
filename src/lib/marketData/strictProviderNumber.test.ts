import { describe, expect, it } from "vitest";
import { strictProviderNumber } from "./strictProviderNumber";

describe("strict provider number", () => {
  it.each([["79418.9",79418.9],[" 0 ",0],[".5",0.5],["-1.25",-1.25],["1e3",1000],[7,7]])("accepts the complete finite value %j",(input,expected)=>{
    expect(strictProviderNumber(input)).toBe(expected);
  });
  it.each(["79418.9junk","$12","1,000",""," ","NaN","Infinity","0x10",null,undefined,{},[],Number.NaN,Number.POSITIVE_INFINITY])("rejects malformed or partial value %j", input=>{
    expect(strictProviderNumber(input)).toBeNull();
  });
});
