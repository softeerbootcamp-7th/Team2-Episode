import GlobalNavigationBar from "@shared/components/global_navigation_bar/GlobalNavigationBar";
import UserBox from "@shared/components/user_box/UserBox";
import { Outlet } from "react-router";

const HomePage = () => {
    return (
        <>
            <GlobalNavigationBar rightSlot={<UserBox name="asdf" />} />

            <main>
                <Outlet />
            </main>
        </>
    );
};

export default HomePage;
