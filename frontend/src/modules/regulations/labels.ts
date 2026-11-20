export function regulationLabel(t: (key: string) => string, code: string) {
  return t(`regulations.${code}`);
}
