import { ComponentPropsWithoutRef } from "react";

import landingEpisode from "@/assets/img/img_landing_episode.png";
import landingMain from "@/assets/img/img_landing_main.png";
import landingMindmap from "@/assets/img/img_landing_mindmap.png";
import { exhaustiveCheck } from "@/utils/exhaustive_check";

type LandingInfoType = "episode" | "main" | "mindmap";
type Props = ComponentPropsWithoutRef<"img"> & {
    name: LandingInfoType;
};

const LandingInfo = ({ name, ...rest }: Props) => {
    return <img src={getLandingInfo(name)} {...rest} />;
};

export default LandingInfo;

const getLandingInfo = (type: LandingInfoType) => {
    switch (type) {
        case "episode":
            return landingEpisode;
        case "main":
            return landingMain;
        case "mindmap":
            return landingMindmap;
        default:
            exhaustiveCheck(`${type}의 landing info 는 올바르지 않습니다.`);
    }
};
