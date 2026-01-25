import { cva } from "class-variance-authority";
import { ComponentPropsWithoutRef, useState } from "react";

const InputVariants = cva(
    "bg-base-white border border-solid border-gray-300 rounded-xl p-4 justify-start items-start focus:border-(--color-primary) focus:outline-none",
    {
        variants: {
            size: {
                sm: "w-147.5 h-12 typo-body-14-medium",
                md: "w-105 min-h-30 typo-body-14-reg resize-none",
                lg: "w-200.5 min-h-30 typo-body-14-reg resize-none",
            },
            status: {
                empty: "text-text-placeholder",
                filled: "text-text-main1",
            },
        },
    },
);

type SingleLineInputProps = Omit<ComponentPropsWithoutRef<"input">, "size"> & {};
type MultilineInputProps = Omit<ComponentPropsWithoutRef<"textarea">, "size"> & {};
const MAX_LENGTH = 43;

export const Input = {
    Small: ({ placeholder, ...rest }: SingleLineInputProps) => {
        const [inputValue, setInputValue] = useState("");
        const status = inputValue ? "filled" : "empty";

        return (
            <input
                className={InputVariants({ size: "sm", status })}
                placeholder={placeholder}
                value={inputValue}
                maxLength={MAX_LENGTH}
                onChange={(e) => setInputValue(e.target.value)}
                {...rest}
            />
        );
    },

    Medium: ({ placeholder, ...rest }: MultilineInputProps) => {
        const [textValue, setTextValue] = useState("");
        const status = textValue ? "filled" : "empty";

        return (
            <textarea
                className={InputVariants({ size: "md", status })}
                placeholder={placeholder}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                {...rest}
            />
        );
    },

    Large: ({ placeholder, ...rest }: MultilineInputProps) => {
        const [textValue, setTextValue] = useState("");
        const status = textValue ? "filled" : "empty";

        return (
            <textarea
                className={InputVariants({ size: "lg", status })}
                placeholder={placeholder}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                {...rest}
            />
        );
    },
};
