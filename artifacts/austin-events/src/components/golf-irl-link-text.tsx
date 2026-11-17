import { Fragment } from "react";

export function GolfIrlLinkText({ text }: { text: string }) {
  const parts = text.split(/(Golf IRL)/g);

  return (
    <>
      {parts.map((part, index) => part === "Golf IRL" ? (
        <a
          key={index}
          href="https://golf.irl.group"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-2 hover:opacity-80"
          data-testid={`link-golf-irl-${index}`}
        >
          {part}
        </a>
      ) : (
        <Fragment key={index}>{part}</Fragment>
      ))}
    </>
  );
}
