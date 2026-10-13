import { Fragment } from "react";

// **words** -> bold. Everything else is plain text.
export function Inline({ text }) {
  return String(text ?? "")
    .split(/(\*\*[^*]+\*\*)/g)
    .map((piece, i) => (piece.startsWith("**") && piece.endsWith("**") ? <b key={i}>{piece.slice(2, -2)}</b> : <Fragment key={i}>{piece}</Fragment>));
}

// Each line of the text on a line of its own.
export function Lines({ text }) {
  return String(text ?? "")
    .split("\n")
    .map((line, i) => (
      <Fragment key={i}>
        {i > 0 && <br />}
        <Inline text={line} />
      </Fragment>
    ));
}

// The small markup an admin can type in a long text field (Site Content):
//   a blank line -> a new paragraph      ## Heading -> a small heading
//   **words**    -> bold
export default function RichText({ text, paragraphClass }) {
  const blocks = String(text ?? "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks.map((block, i) => {
    const lines = block.split("\n");
    const heading = lines[0].startsWith("## ") ? lines.shift().slice(3) : null;
    const rest = lines.join("\n").trim();
    return (
      <Fragment key={i}>
        {heading && <h3>{heading}</h3>}
        {rest && (
          <p className={paragraphClass}>
            <Lines text={rest} />
          </p>
        )}
      </Fragment>
    );
  });
}
