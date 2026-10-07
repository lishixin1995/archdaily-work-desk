export function PageHeading({ eyebrow, title, children }) {
  return (
    <div className="pageHeading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}
