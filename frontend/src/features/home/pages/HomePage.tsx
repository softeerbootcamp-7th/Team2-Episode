import { Outlet } from "react-router";

const HomePage = () => {
    return (
        <div className="min-h-screen overflow-hidden">
            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default HomePage;
