import {
  cloneElement,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";

type FormControl = ReactElement<{ id?: string }>;

export function FormField({
  label,
  hint,
  control,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  control: FormControl;
  className?: string;
}) {
  const generatedId = useId();
  const controlId = control.props.id ?? generatedId;
  return (
    <label className={`field ${className}`.trim()} htmlFor={controlId}>
      <span>
        {label} {hint ? <small>{hint}</small> : null}
      </span>
      {cloneElement(control, { id: controlId })}
    </label>
  );
}

export function InputField({
  label,
  hint,
  className,
  ...inputProps
}: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <FormField
      label={label}
      hint={hint}
      className={className ?? ""}
      control={<input {...inputProps} />}
    />
  );
}
