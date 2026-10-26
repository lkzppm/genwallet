import type { Metadata } from "next";
import { Builder } from "@/components/builder/builder";
import { pt } from "@/i18n/pt";

// Metadata is rendered on the server, before the visitor's language is known: Portuguese, the default.
export const metadata: Metadata = {
  title: `${pt.builder.eyebrow} · GenWallet`,
  description: pt.builder.meta,
};

export default function Page() {
  return <Builder />;
}
