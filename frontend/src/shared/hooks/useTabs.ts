import { useState } from "react";

export const useTabs = <T extends string>(initialValue: T) => {
    const [selectedValue, setSelectedValue] = useState<T>(initialValue);

    const onChange = (value: T) => {
        setSelectedValue(value);
    };

    return {
        selectedValue,
        onChange,
    };
};
