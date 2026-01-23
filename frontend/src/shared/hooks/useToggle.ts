import { useReducer } from "react";

type Action = { type: "ON" } | { type: "OFF" } | { type: "TOGGLE" };

type Props = {
    defaultValue?: boolean;
};

const useToggle = ({ defaultValue = false }: Props = {}) => {
    const [state, dispatch] = useReducer(toggleReducer, defaultValue);

    const setOn = () => dispatch({ type: "ON" });
    const setOff = () => dispatch({ type: "OFF" });
    const toggle = () => dispatch({ type: "TOGGLE" });

    return [state, { setOn, setOff, toggle }] as const;
};

export default useToggle;

function toggleReducer(state: boolean, action: Action): boolean {
    switch (action.type) {
        case "ON":
            return true;
        case "OFF":
            return false;
        case "TOGGLE":
            return !state;
        default:
            return state;
    }
}
