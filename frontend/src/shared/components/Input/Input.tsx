import { VariantProps } from "class-variance-authority";
import { ComponentPropsWithoutRef } from "react";

import { InputVariants } from "@/shared/styles/input_variants";

type SingleLineInputProps = ComponentPropsWithoutRef<"input"> &
    Omit<VariantProps<typeof InputVariants>, "fullWidth"> & {
        isFullWidth?: boolean;
        maxLength?: number;
    };

const MAX_LENGTH = 43;

export default function Input({
    placeholder,
    value,
    inputSize = "md",
    isFullWidth = false,
    maxLength = MAX_LENGTH,
    ...rest
}: SingleLineInputProps) {
    const status = value ? "filled" : "empty";

    return (
        <input
            className={InputVariants({ inputSize, status, fullWidth: isFullWidth })}
            placeholder={placeholder}
            value={value || ""}
            maxLength={maxLength}
            {...rest}
        />
    );
}
