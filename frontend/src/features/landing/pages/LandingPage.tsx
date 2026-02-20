import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { useAuth } from "@/features/auth/hooks/useAuth";
import LandingInfo from "@/features/landing/components/LandingInfo";
import Button from "@/shared/components/button/Button";
import CallToActionButton from "@/shared/components/call_to_action_button/CallToActionButton";
import GlobalNavigationBar from "@/shared/components/global_navigation_bar/GlobalNavigationBar";
import Icon from "@/shared/components/icon/Icon";
import Popover from "@/shared/components/popover/Popover";
import UserBox from "@/shared/components/user_box/UserBox";
import { linkTo } from "@/shared/utils/route";
import { cn } from "@/utils/cn";

type FocusKey = "mindmap" | "self_diagnosis" | "episode_archive";

const LandingPage = () => {
    const { user, logout } = useAuth();
    const scrollRootRef = useRef<HTMLDivElement | null>(null);
    const [focused, setFocused] = useState<FocusKey>("mindmap");

    const sectionRefs = useRef<Record<FocusKey, HTMLElement | null>>({
        mindmap: null,
        self_diagnosis: null,
        episode_archive: null,
    });

    const setSectionRef = useCallback(
        (key: FocusKey) => (el: HTMLElement | null) => {
            sectionRefs.current[key] = el;
        },
        [],
    );

    const getHref = useCallback(
        (from: FocusKey | "start"): string => {
            if (!user) return linkTo.login();

            switch (from) {
                case "start":
                    return linkTo.home();
                case "mindmap":
                    return linkTo.mindmap.list();
                case "episode_archive":
                    return linkTo.episode_archive();
                case "self_diagnosis":
                    return linkTo.self_diagnosis.list();
                default:
                    return linkTo.home();
            }
        },
        [user],
    );

    const scrollTo = useCallback((key: FocusKey) => {
        const target = sectionRefs.current[key];
        if (!target) return;

        target.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }, []);

    useEffect(() => {
        const root = scrollRootRef.current;
        if (!root) return;

        const targets = Object.entries(sectionRefs.current)
            .map(([key, el]) => ({ key: key as FocusKey, el }))
            .filter((v): v is { key: FocusKey; el: HTMLElement } => Boolean(v.el));

        if (targets.length === 0) return;

        const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);

        const observer = new IntersectionObserver(
            (entries: IntersectionObserverEntry[]) => {
                const intersecting = entries.filter((e) => e.isIntersecting);
                if (intersecting.length === 0) return;

                const best = intersecting.reduce((prev, cur) => {
                    return prev.intersectionRatio >= cur.intersectionRatio ? prev : cur;
                });

                const key = (best.target as HTMLElement).dataset.section as FocusKey;
                if (key) setFocused(key);
            },
            {
                root,
                rootMargin: "-45% 0px -45% 0px",
                threshold: thresholds,
            },
        );

        targets.forEach(({ el }) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        // 1. 전체 컨테이너를 h-screen overflow-hidden으로 고정
        <div className="flex flex-col h-screen overflow-hidden bg-landing">
            {/* 2. GNB를 스크롤 영역 밖으로 배치 (Popover가 잘리지 않음) */}
            <GlobalNavigationBar
                variant="transparent"
                className="z-50"
                rightSlot={
                    user ? (
                        <Popover
                            direction="bottom_left"
                            contents={
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="bg-white border border-gray-200 rounded-lg px-4 py-2 typo-body-14-medium text-text-main2 shadow-md"
                                >
                                    로그아웃
                                </button>
                            }
                        >
                            <UserBox name={user.nickname} />
                        </Popover>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link to={linkTo.login()}>
                                <Button size="xs" borderRadius="md" variant="quaternary_accent_outlined">
                                    로그인
                                </Button>
                            </Link>
                            <Link to={linkTo.login()}>
                                <Button size="xs" borderRadius="md" variant="primary">
                                    가입하기
                                </Button>
                            </Link>
                        </div>
                    )
                }
            />

            {/* 3. 실제 스크롤이 발생하는 본문 영역 */}
            <main
                ref={scrollRootRef}
                className={cn("flex-1 overflow-y-auto overflow-x-hidden", "snap-y snap-mandatory scroll-smooth")}
            >
                <section className="relative snap-start min-h-screen w-full pt-24 pb-16">
                    <div className="mx-auto w-full max-w-5xl px-6 flex flex-col items-center">
                        <p className="typo-body-18-medium text-gray-500 pb-5">경험의 경로를 알려주다</p>
                        <Icon name="ic_logo" width="360" height="68" viewBox="0 0 87 16" />
                        <p className="mt-10 text-center typo-body-24-medium text-text-main1">
                            흩어진 경험을 하나의 흐름으로,
                            <br />
                            취업 준비의 모든 과정을 한 곳에서
                        </p>
                        <div className="mt-10 flex items-center gap-3">
                            <Button
                                type="button"
                                variant="quaternary_accent_outlined"
                                borderRadius="md"
                                size="sm"
                                onClick={() => scrollTo("mindmap")}
                            >
                                둘러보기
                            </Button>
                            <Link to={getHref("start")}>
                                <CallToActionButton variant="primary">에피소드 시작하기</CallToActionButton>
                            </Link>
                        </div>
                        <div className="mt-10 w-full">
                            <div className="mx-auto w-full max-w-5xl">
                                <LandingInfo
                                    name="main"
                                    alt="EPISODE 메인 화면"
                                    className="w-full h-auto rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-gray-100 bg-white"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 반복되는 섹션 구조 (예시: 마인드맵) */}
                <section
                    ref={setSectionRef("mindmap")}
                    data-section="mindmap"
                    className={cn(
                        "snap-center snap-always min-h-screen w-full flex items-center justify-center py-14",
                        "transition-all duration-500 ease-out",
                        focused === "mindmap" ? "opacity-100 blur-0" : "opacity-40 blur-sm",
                    )}
                >
                    <div className="mx-auto w-full max-w-5xl px-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-8 md:p-10 relative">
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <LandingInfo
                                    name="mindmap"
                                    alt="마인드맵 기능"
                                    // w-115(460px) 대신 Tailwind 표준 w-[460px] 혹은 근사값 사용
                                    className="w-full md:w-[460px] h-auto rounded-xl border border-gray-100"
                                />
                                <div className="flex-1 w-full">
                                    <h2 className="typo-title-28-bold text-text-main1">마인드맵</h2>
                                    {/* ...내용 생략... */}
                                    <div className="mt-8 flex justify-end">
                                        <Link to={getHref("mindmap")}>
                                            <CallToActionButton variant="quaternary_accent_outlined">
                                                마인드맵 시작하기
                                            </CallToActionButton>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 나머지 섹션들(self_diagnosis, episode_archive)도 동일한 방식으로 구성 */}

                <section className="snap-start min-h-[70vh] w-full flex items-center justify-center pb-24">
                    <Link to={getHref("start")}>
                        <CallToActionButton variant="quaternary_accent_outlined">에피소드 시작하기</CallToActionButton>
                    </Link>
                </section>
            </main>
        </div>
    );
};

export default LandingPage;
