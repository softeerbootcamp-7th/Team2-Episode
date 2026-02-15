import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { useAuth } from "@/features/auth/hooks/useAuth";
import LandingInfo from "@/features/landing/components/LandingInfo";
import { Logo } from "@/features/landing/components/Logo";
import Button from "@/shared/components/button/Button";
import CallToActionButton from "@/shared/components/call_to_action_button/CallToActionButton";
import GlobalNavigationBar from "@/shared/components/global_navigation_bar/GlobalNavigationBar";
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
            if (!user) {
                return linkTo.login();
            }

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
        const root = scrollRootRef.current;
        const target = sectionRefs.current[key];
        if (!root || !target) return;

        target.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }, []);

    const gnbRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = scrollRootRef.current;
        if (!root) return;

        const targets = Object.entries(sectionRefs.current)
            .map(([key, el]) => ({ key: key, el }))
            .filter((v) => Boolean(v.el));

        if (targets.length === 0) {
            return;
        }

        const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);

        const observer = new IntersectionObserver(
            (entries) => {
                // 겹치는 애들
                const intersecting = entries.filter((e) => e.isIntersecting);
                if (intersecting.length === 0) {
                    return;
                }

                const best = intersecting.reduce((prev, cur) => {
                    return prev.intersectionRatio >= cur.intersectionRatio ? prev : cur;
                });

                const key = (best.target as HTMLElement).dataset.section as FocusKey | undefined;
                if (!key) {
                    return;
                }

                setFocused((prev) => (prev === key ? prev : key));
            },
            {
                root,
                rootMargin: "-45% 0px -45% 0px", // 가운데 10%만 감지 영역
                threshold: thresholds,
            },
        );

        targets.forEach(({ el }) => observer.observe(el as Element));

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={scrollRootRef}
            className={cn(
                "relative h-screen w-full overflow-y-auto overflow-x-hidden bg-landing",
                "snap-y snap-mandatory scroll-smooth",
                "scroll-pt-(--gnb-h)",
            )}
        >
            <div className="sticky top-0 z-50" ref={gnbRef}>
                <GlobalNavigationBar
                    variant="transparent"
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
            </div>

            <section className="relative snap-start min-h-screen w-full pt-24 pb-16">
                <div className="mx-auto w-full max-w-5xl px-6 flex flex-col items-center">
                    <p className="typo-body-14-medium text-text-sub1">경험의 갈래를 연결하다</p>

                    <Logo />

                    <p className="mt-10 text-center typo-body-16-medium text-text-sub1">
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
                                className="w-full md:w-115 h-auto rounded-xl border border-gray-100"
                            />

                            <div className="flex-1 w-full">
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

                                <div className="mt-8 flex justify-end absolute bottom-10 right-10">
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

            <section
                ref={setSectionRef("self_diagnosis")}
                data-section="self_diagnosis"
                className={cn(
                    "snap-center snap-always min-h-screen w-full flex items-center justify-center py-14",
                    "transition-all duration-500 ease-out",
                    focused === "self_diagnosis" ? "opacity-100 blur-0" : "opacity-40 blur-sm",
                )}
            >
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-8 md:p-10 relative">
                        <div className="flex flex-col md:flex-row items-center gap-10">
                            <div className="flex-1 w-full order-2 md:order-1">
                                <h2 className="typo-title-28-bold text-text-main1">기술문제 셀프진단</h2>
                                <p className="mt-3 typo-body-16-reg text-text-sub1">
                                    기술 자소서 문항을 기준으로 빈틈을 점검하세요.
                                    <br />
                                    부족한 역량을 발견하고, 에피소드를 준비할 수 있어요.
                                </p>

                                <ul className="mt-6 space-y-3">
                                    <li className="flex items-start gap-3">
                                        <span className="mt-1.75 inline-block size-2 rounded-full bg-primary" />
                                        <span className="typo-body-14-reg text-text-sub1">
                                            주요 직무별 자소서 문항 분석
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="mt-1.75 inline-block size-2 rounded-full bg-primary" />
                                        <span className="typo-body-14-reg text-text-sub1">
                                            기술 역량을 드러내는 질문 추천
                                        </span>
                                    </li>
                                </ul>

                                <div className="mt-8 flex justify-start absolute bottom-10 left-10">
                                    <Link to={getHref("self_diagnosis")}>
                                        <CallToActionButton variant="quaternary_accent_outlined">
                                            기술문제 셀프진단 하기
                                        </CallToActionButton>
                                    </Link>
                                </div>
                            </div>

                            <LandingInfo
                                name="self_test"
                                alt="기술문제 셀프진단 기능"
                                className="w-full md:w-115 h-auto rounded-xl border border-gray-100 order-1 md:order-2"
                            />
                        </div>
                    </div>
                </div>
            </section>

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
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-8 md:p-10 relative">
                        <div className="flex flex-col md:flex-row items-center gap-10">
                            <LandingInfo
                                name="episode"
                                alt="에피소드 보관함 기능"
                                className="w-full md:w-115 h-auto rounded-xl border border-gray-100"
                            />

                            <div className="flex-1 w-full">
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
                                        <span className="typo-body-14-reg text-text-sub1">태그 기반 검색 및 정리</span>
                                    </li>
                                </ul>

                                <div className="mt-8 flex justify-end bottom-10 right-10 absolute">
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

            <section className="snap-start min-h-[70vh] w-full flex items-center justify-center pb-24">
                <Link to={getHref("start")}>
                    <CallToActionButton variant="quaternary_accent_outlined">에피소드 시작하기</CallToActionButton>
                </Link>
            </section>
        </div>
    );
};

export default LandingPage;
