import { StructuredTool } from "@langchain/core/tools";
import {
  orderLookupTool,
  refundTool,
  technicalSupportTool,
} from "../tools/general";

export const READONLY_TOOLS_BY_NAME: Record<string, StructuredTool> = {
  technical_support_manual: technicalSupportTool,
  order_lookup: orderLookupTool,
};

export const AUTHORIZED_TOOLS_BY_NAME: Record<string, StructuredTool> = {
  refund_purchase: refundTool,
};
