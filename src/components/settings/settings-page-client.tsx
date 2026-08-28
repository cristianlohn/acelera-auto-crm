/**
 * @file settings-page-client.tsx
 * @description Wrapper client para a página de configurações.
 */

"use client";

import { SettingsForm, type SettingsFormProps } from "./settings-form";

export function SettingsPageClient(props: SettingsFormProps) {
  return <SettingsForm {...props} />;
}

export default SettingsPageClient;
