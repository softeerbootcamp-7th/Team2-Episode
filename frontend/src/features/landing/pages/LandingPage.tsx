import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { useAuth } from "@/features/auth/hooks/useAuth";
import LandingInfo from "@/features/landing/components/LandingInfo";
import CallToActionButton from "@/shared/components/call_to_action_button/CallToActionButton";
import Icon from "@/shared/components/icon/Icon";
import { linkTo } from "@/shared/utils/route";
import { cn } from "@/utils/cn";

type FocusKey = "mindmap" | "episode_archive";

const LandingPage = () => {
    const { user } = useAuth();

    const scrollRootRef = useRef<HTMLDivElement | null>(null);
    const [focused, setFocused] = useState<FocusKey>("mindmap");

    const sectionRefs = useRef<Record<FocusKey, HTMLElement | null>>({
        mindmap: null,
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
                    return linkTo.mindmap.list();
                case "mindmap":
                    return linkTo.mindmap.list();
                case "episode_archive":
                    return linkTo.episode_archive();
                default:
                    return linkTo.home();
            }
        },
        [user],
    );

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
                rootMargin: "-10% 0PX -10% 0px",
                threshold: thresholds,
            },
        );

        targets.forEach(({ el }) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const newLocal = "h-auto w-full rounded-xl border border-gray-100 md:w-[460px]";
    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden bg-landing">
            <main
                ref={scrollRootRef}
                className={cn("flex-1 w-full overflow-y-auto overflow-x-hidden", "snap-y snap-mandatory scroll-smooth")}
            >
                {/* 메인 섹션 */}
                <section className="relative min-h-screen w-full snap-start pb-16 pt-24">
                    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-6">
                        <p className="pb-5 typo-body-18-medium text-gray-500">경험의 경로를 알려주다</p>
                        <Icon name="ic_logo" width="360" height="68" viewBox="0 0 87 16" />
                        <p className="mt-10 text-center typo-body-24-medium text-text-main1">
                            흩어진 경험을 하나의 흐름으로,
                            <br />
                            취업 준비의 모든 과정을 한 곳에서
                        </p>
                        <div className="mt-10 flex items-center gap-3">
                            <Link to={getHref("start")}>
                                <CallToActionButton variant="primary">마인드맵 시작하기</CallToActionButton>
                            </Link>
                        </div>
                        <div className="mt-10 w-full">
                            <div className="mx-auto w-full max-w-5xl">
                                <LandingInfo
                                    name="main"
                                    alt="EPISODE 메인 화면"
                                    className="h-auto w-full rounded-2xl border border-gray-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 마인드맵 섹션 */}
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
                        <div className="relative rounded-2xl border border-gray-100 bg-white p-10 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
                            <div className="flex flex-col items-center gap-10 md:flex-row">
                                <LandingInfo
                                    name="mindmap"
                                    alt="마인드맵 기능"
                                    className="h-auto w-full rounded-xl border border-gray-100 md:w-115"
                                />
                                <div className="w-full flex-1">
                                    <h2 className="typo-title-28-bold text-text-main1">마인드맵</h2>
                                    <p className="mt-3 typo-body-16-reg text-text-sub1">
                                        경험을 시각적으로 구조화하고 관리하세요.
                                        <br />
                                        노드로 연결하며 개요 구조를 체계적으로 정리할 수 있어요.
                                    </p>
                                    <ul className="mt-6 space-y-3">
                                        <li className="flex items-start gap-3">
                                            <span className="mt-1.75 inline-block size-2 rounded-full bg-primary" />
                                            <span className="typo-body-14-reg text-text-sub1">
                                                한줄 카테고리/클러스터 구조화
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="mt-1.75 inline-block size-2 rounded-full bg-primary" />
                                            <span className="typo-body-14-reg text-text-sub1">
                                                실시간 협업 및 공유 기능
                                            </span>
                                        </li>
                                    </ul>
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

                {/* 에피소드 보관함 섹션 */}
                <section
                    ref={setSectionRef("episode_archive")}
                    data-section="episode_archive"
                    className={cn(
                        "snap-center snap-always min-h-screen w-full flex items-center justify-center py-14",
                        "transition-all duration-500 ease-out",
                        focused === "episode_archive" ? "opacity-100 blur-0" : "opacity-40 blur-sm",
                    )}
                >
                    <div className="mx-auto w-full max-w-5xl px-6">
                        <div className="relative rounded-2xl border border-gray-100 bg-white p-10 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
                            <div className="flex flex-col items-center gap-10 md:flex-row">
                                <LandingInfo name="episode" alt="에피소드 보관함 기능" className={newLocal} />
                                <div className="w-full flex-1">
                                    <h2 className="typo-title-28-bold text-text-main1">에피소드 보관함</h2>
                                    <p className="mt-3 typo-body-16-reg text-text-sub1">
                                        모든 경험을 STAR 기반으로 체계적으로 정리해요.
                                        <br />
                                        자기소개서에 필요한 에피소드를 완성할 수 있어요.
                                    </p>
                                    <ul className="mt-6 space-y-3">
                                        <li className="flex items-start gap-3">
                                            <span className="mt-1.75 inline-block size-2 rounded-full bg-primary" />
                                            <span className="typo-body-14-reg text-text-sub1">
                                                STAR 형식으로 에피소드 작성
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="mt-1.75 inline-block size-2 rounded-full bg-primary" />
                                            <span className="typo-body-14-reg text-text-sub1">
                                                마인드맵 기반 에피소드 연결
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="mt-1.75 inline-block size-2 rounded-full bg-primary" />
                                            <span className="typo-body-14-reg text-text-sub1">
                                                태그 기반 검색 및 정리
                                            </span>
                                        </li>
                                    </ul>
                                    <div className="mt-8 flex justify-end">
                                        <Link to={getHref("episode_archive")}>
                                            <CallToActionButton variant="quaternary_accent_outlined">
                                                에피소드 보관함 가기
                                            </CallToActionButton>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default LandingPage;
