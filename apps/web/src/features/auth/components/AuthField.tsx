export function AuthField({
  label,
  name,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} type={type} required {...props} />
    </label>
  );
}

export function FormError({ children }: { children: string }) {
  return (
    <p className="form-error" role="alert">
      {children}
    </p>
  );
}
