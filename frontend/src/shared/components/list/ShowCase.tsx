import React from "react";
import List from "./List";
import ListRow from "./ListRow";
import ListGroup from "./ListGroup";
import Divider from "../divider/Divider";
import groupBy from "@utils/groupBy"; // 경로에 맞춰 수정하세요
import Icon from "../icon/Icon";

// 임시 아이콘 대용 (실제 프로젝트에서는 Lucide나 Heroicons 등을 사용하세요)
const IconPlaceholder = () => <div className="w-5 h-5 bg-cobalt-200 rounded-full" />;
const ArrowIcon = () => <span className="text-gray-400">→</span>;

interface SampleData {
    id: number;
    category: "설정" | "알림" | "계정";
    title: string;
    description?: string;
    isAlert?: boolean;
}

const sampleItems: SampleData[] = [
    { id: 1, category: "설정", title: "다크 모드", description: "화면 테마 변경" },
    { id: 2, category: "설정", title: "언어 설정", description: "한국어" },
    { id: 3, category: "알림", title: "마케팅 수신 동의", isAlert: false },
    { id: 4, category: "알림", title: "보안 경고", isAlert: true },
    { id: 5, category: "계정", title: "로그아웃", isAlert: true },
    { id: 6, category: "계정", title: "회원 탈퇴", isAlert: true },
];

const ListShowCase = () => {
    // 1. GroupBy 실행
    const groupedData = Object.entries(
        groupBy({
            array: sampleItems,
            keyBy: (item) => item.category,
        }),
    );

    return (
        <div className="p-10 bg-gray-50 min-h-screen space-y-12">
            {/* CASE 1: 기본 및 모든 슬롯 활용 */}
            <section>
                <h2 className="text-xl font-bold mb-4 text-gray-700">1. Variant & Slots Showcase</h2>
                <List className="w-[360px]">
                    <ListRow contents="기본 리스트 아이템" />
                    <ListRow leftSlot={<Icon name="ic_chevron_left" />} contents="왼쪽 슬롯(아이콘) 포함" />
                    <ListRow
                        contents="오른쪽 슬롯 포함"
                        rightSlot={<span className="text-xs text-cobalt-500 font-medium">NEW</span>}
                    />
                    <ListRow
                        variant="alert"
                        contents="경고(Alert) 스타일"
                        rightSlot={<Icon name="ic_arrow_right" color="gray" />}
                    />
                    <ListRow
                        leftSlot={<IconPlaceholder />}
                        contents={
                            <div className="flex flex-col">
                                <span className="font-bold">복합 컨텐츠</span>
                                <span className="text-xs opacity-60">설명이 아래에 들어가는 구조</span>
                            </div>
                        }
                        rightSlot={<input type="checkbox" className="w-4 h-4" />}
                    />
                </List>
            </section>

            {/* CASE 2: Divider 미사용 모드 */}
            <section>
                <h2 className="text-xl font-bold mb-4 text-gray-700">2. No Divider List</h2>
                <List hasDivider={false} className="w-[360px]">
                    <ListRow contents="구분선이 없는 리스트입니다." />
                    <ListRow contents="깔끔한 레이아웃을 원할 때 사용합니다." />
                    <ListRow contents="아이템 간격이 밀착됩니다." />
                </List>
            </section>

            {/* CASE 3: GroupBy & Divider 활용 */}
            <section>
                <h2 className="text-xl font-bold mb-4 text-gray-700">3. Grouped List (Using groupBy)</h2>
                <List>
                    {groupedData.map(([category, items]) => (
                        <ListGroup key={category}>
                            {items.map((item) => (
                                <ListRow key={item.id} leftSlot={<></>} contents={<></>} rightSlot={<></>} />
                            ))}
                        </ListGroup>
                    ))}
                </List>
            </section>
        </div>
    );
};

export default ListShowCase;
