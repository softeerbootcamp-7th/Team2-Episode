import imgEmptyEpisode from "@/assets/img/img_empty_episode.png";

// 1. 이 파일에서만 사용하는 이미지 매핑 상수
const EMPTY_ASSETS = {
    empty: imgEmptyEpisode,
} as const;

type EmptyEpisodeProps = {
    username?: string;
};

export default function EmptyEpisode({ username = "사용자" }: EmptyEpisodeProps) {
    return (
        <div className="flex flex-col items-center justify-center w-full py-40">
            <img
                src={EMPTY_ASSETS.empty}
                alt="에피소드 없음"
                className="w-37.5 h-33.25 aspect-97/86 mb-6 object-contain"
            />

            <p className="text-text-sub1 typo-body-16-reg-160 text-center whitespace-pre-wrap font-medium tracking-body">
                {username} 님의 에피소드 작성을{"\n"}기다리는 중이에요
            </p>
        </div>
    );
}
