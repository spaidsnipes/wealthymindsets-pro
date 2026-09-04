import { describe, expect, it } from "vitest";
import { parseOptionContractResponse } from "./optionContractResponse";
const valid = {symbol:"TSLA TEST",contractType:"call",expirationDate:"2026-12-18",strike:100,bid:0,ask:1,delta:-0.2};
describe("options response structural truth", () => {
  it("accepts existing envelopes, zero quotes and negative signed Greeks", () => {
    for (const response of [[valid],{chain:[valid]},{optionChain:[valid]}]) {
      expect(parseOptionContractResponse(response)[0]).toMatchObject(valid);
    }
  });
  it("preserves omitted quotes as absent and normalizes the type alias", () => {
    const {contractType,...rest}=valid;
    const result=parseOptionContractResponse([{...rest,bid:null,type:"PUT"}])[0];
    expect(result.contractType).toBe("put");
    expect(result.bid).toBeUndefined();
    expect(result.volume).toBeUndefined();
  });
  it.each([null,{}, {chain:{}},[null],[{}]])("rejects malformed containers %j", response => {
    expect(()=>parseOptionContractResponse(response)).toThrow(/Malformed options/);
  });
  it.each([{expirationDate:"2026-02-30"},{expirationDate:"2026-1-1"},{strike:NaN},{strike:0},{strike:"100"},{contractType:"unknown"},{symbol:" "},{bid:Infinity},{ask:-1},{volume:"12"}])("rejects invalid identity/value %j", patch => {
    expect(()=>parseOptionContractResponse([{...valid,...patch}])).toThrow(/Malformed options/);
  });
  it("does not silently choose one duplicate contract", () => {
    expect(()=>parseOptionContractResponse([valid,{...valid,ask:10}])).toThrow(/Ambiguous/);
  });
  it("preserves a genuinely empty list", () => expect(parseOptionContractResponse([])).toEqual([]));
});
