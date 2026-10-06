import { Link } from "react-router-dom";

// A link whose address was typed in the admin: a path on this site
// ("/events") stays in the app; anything else (https://…, mailto:…) opens
// as a normal link in a new tab. No address at all renders plain text.
export default function SmartLink({ to, className, children }) {
  if (!to) return <span className={className}>{children}</span>;
  if (to.startsWith("/")) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
