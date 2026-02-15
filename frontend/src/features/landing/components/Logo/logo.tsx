import { ComponentPropsWithoutRef } from "react";

import logoImg from "@/assets/img/logo.png";

type Props = ComponentPropsWithoutRef<"img"> & {};

export const Logo = ({ ...rest }: Props) => {
    return <img src={logoImg} {...rest} />;
};
