(function () {
    const theme = localStorage.getItem("transalink_theme") || "light";
    const fontScale = localStorage.getItem("transalink_font_scale") || "100";

    document.documentElement.style.fontSize = `${fontScale}%`;

    if (theme === "dark") {
        document.body.classList.add("dark-mode");
        document.documentElement.classList.add("dark-mode-preload");
    } else {
        document.body.classList.remove("dark-mode");
        document.documentElement.classList.remove("dark-mode-preload");
    }
})();