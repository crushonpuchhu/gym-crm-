"use client";

import { Stack as MuiStack, type StackProps as MuiStackProps } from "@mui/material";

/**
 * MUI v9 dropped the box-alignment shorthands from `Stack` own props, so this
 * thin wrapper keeps the v7 ergonomics (`alignItems`, `justifyContent`,
 * `flexWrap`) by folding them into `sx`.
 */
export type StackProps = MuiStackProps & {
  alignItems?: any;
  justifyContent?: any;
  flexWrap?: any;
  gap?: any;
};

export function Stack({ alignItems, justifyContent, flexWrap, gap, sx, ...rest }: StackProps) {
  const extra = { alignItems, justifyContent, flexWrap, gap };
  const merged = Array.isArray(sx) ? [...sx, extra] : { ...(sx as object | undefined), ...extra };
  return <MuiStack {...rest} sx={merged} />;
}

export default Stack;
