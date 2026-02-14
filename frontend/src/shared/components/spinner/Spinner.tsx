const Spinner = () => {
    return (
        <div className="flex h-full w-full items-center justify-center min-h-50">
            <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-primary animate-spin"></div>
            </div>
            <span className="ml-3 font-medium text-gray-600">데이터를 불러오는 중...</span>
        </div>
    );
};

export default Spinner;
