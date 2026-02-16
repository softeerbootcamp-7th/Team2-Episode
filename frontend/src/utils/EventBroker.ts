type CleanUp = () => void;

/**
 * 시스템 내부의 이벤트를 발행하고 구독하는 중앙 이벤트 허브
 */
export class EventBroker<TEvents extends Record<string, unknown>> {
    // 이벤트 키별 구독자(콜백 함수 세트)를 관리하는 저장소
    private subscribers: Map<keyof TEvents, Set<(data: TEvents[keyof TEvents]) => void>> = new Map();

    /** 특정 이벤트가 발생했을 때 실행될 콜백 함수를 등록하고 해제 함수를 반환 */
    subscribe<K extends keyof TEvents>({ key, callback }: { key: K; callback: (data: TEvents[K]) => void }): CleanUp {
        const container = this.getCallbacks(key);

        container.add(callback as (data: TEvents[keyof TEvents]) => void);

        return () => {
            const container = this.subscribers.get(key);
            if (!container) return;
            container.delete(callback as (data: TEvents[keyof TEvents]) => void);
            if (container.size === 0) this.subscribers.delete(key);
        };
    }

    /** 특정 이벤트를 발생시키고 해당 이벤트를 구독 중인 모든 콜백에 데이터를 전달 */
    publish<K extends keyof TEvents>(key: K, data: TEvents[K]) {
        const container = this.subscribers.get(key);
        if (container) {
            container.forEach((callback) => callback(data));
        }
    }

    /** 이벤트 키에 해당하는 구독자 세트를 가져오거나 없으면 새로 생성 */
    private getCallbacks<K extends keyof TEvents>(key: K): Set<(data: TEvents[keyof TEvents]) => void> {
        let container = this.subscribers.get(key);
        if (!container) {
            container = new Set();
            this.subscribers.set(key, container);
        }
        return container;
    }
}
