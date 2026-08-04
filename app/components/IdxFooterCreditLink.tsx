type IdxFooterCreditLinkProps = {
  className?: string;
};

/** Shared “by idxsolana.io” credit link. */
export function IdxFooterCreditLink({ className }: IdxFooterCreditLinkProps) {
  return (
    <a
      className={["idx-footer-credit", className].filter(Boolean).join(" ")}
      href="https://idxsolana.io"
      target="_blank"
      rel="noopener noreferrer"
    >
      by idxsolana.io
    </a>
  );
}
