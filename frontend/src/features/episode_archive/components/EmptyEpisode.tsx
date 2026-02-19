import imgEmptyEpisode from "@/assets/img/img_empty_episode.png";

// 1. 이 파일에서만 사용하는 이미지 매핑 상수
const EMPTY_ASSETS = {
    empty: imgEmptyEpisode,
} as const;

type EmptyEpisodeProps = {
    username?: string;
};

/**
 * 2단계: 데이터가 없을 때 표시되는 빈 화면 컴포넌트입니다.
 */
export default function EmptyEpisode({ username = "사용자" }: EmptyEpisodeProps) {
    return (
        <div className="flex flex-col items-center justify-center w-full py-40">
            {/* 2. 매핑 객체에서 직접 src를 가져와 가독성을 높임 */}
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
