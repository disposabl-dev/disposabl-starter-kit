import { uiTranslations } from "fumadocs-ui/i18n";
import { openapiTranslations } from "fumadocs-openapi/i18n";
import { useGT, useLocale } from "gt-tanstack-start";
import { i18n } from "./i18n";

const languageNames = Object.fromEntries(
  i18n.languages.map((lang) => [
    lang,
    {
      displayName:
        new Intl.DisplayNames([lang], { type: "language" }).of(lang) ?? lang,
    },
  ]),
);

/** Translate Fumadocs labels with GT while preserving Fumadocs interpolation tokens. */
export function useFumadocsTranslations() {
  const gt = useGT();
  const locale = useLocale();

  return i18n
    .translations()
    .extend(uiTranslations())
    .extend(openapiTranslations())
    .add({
      ...languageNames,
      [locale]: {
        ...languageNames[locale],
        "Ask AI(AI chat button)": gt("Ask AI"),
        "Back to Home(404 page)": gt("Back to Home"),
        "Choose a language(language switcher)": gt("Choose a language"),
        "Choose a language(language switcher)(aria-label)":
          gt("Choose a language"),
        "Close Banner(banner)(aria-label)": gt("Close Banner"),
        "Close Search(search dialog)(aria-label)": gt("Close Search"),
        "Close Sidebar(aria-label)": gt("Close Sidebar"),
        "Close Sidebar(sidebar)(aria-label)": gt("Close Sidebar"),
        "Close(image zoom)(aria-label)": gt("Close"),
        "Collapse Sidebar(sidebar)(aria-label)": gt("Collapse Sidebar"),
        "Copied Anchor Link(heading anchor)(aria-label)":
          gt("Copied Anchor Link"),
        "Copied Link(accordion)(aria-label)": gt("Copied Link"),
        "Copied Markdown(page actions)": gt("Copied Markdown"),
        "Copied Text(code block)(aria-label)": gt("Copied Text"),
        "Copy Anchor Link(heading anchor)(aria-label)": gt("Copy Anchor Link"),
        "Copy Link(accordion)(aria-label)": gt("Copy Link"),
        "Copy Markdown(page actions)": gt("Copy Markdown"),
        "Copy Text(code block)(aria-label)": gt("Copy Text"),
        "Dark(theme switcher)(aria-label)": gt("Dark"),
        "Default(type table)": gt("Default"),
        "Edit on GitHub(edit page)": gt("Edit on GitHub"),
        "Hide Sidebar(sidebar)": gt("Hide Sidebar"),
        "Image Viewer(image zoom)(aria-label)": gt("Image Viewer"),
        "Last updated on(page footer)": gt("Last updated on"),
        "Layout Tab(layout tab trigger)": gt("Layout Tab"),
        "Light(theme switcher)(aria-label)": gt("Light"),
        "Next Image(image zoom)(aria-label)": gt("Next Image"),
        "Next Page(pagination)": gt("Next Page"),
        "No Headings(table of contents)": gt("No Headings"),
        "No results found(search dialog)": gt("No results found"),
        "On this page(table of contents)": gt("On this page"),
        "Open Search(search trigger)(aria-label)": gt("Open Search"),
        "Open Sidebar(sidebar)(aria-label)": gt("Open Sidebar"),
        "Open in ChatGPT(page actions)": gt("Open in ChatGPT"),
        "Open in Claude(page actions)": gt("Open in Claude"),
        "Open in Cursor(page actions)": gt("Open in Cursor"),
        "Open in GitHub(page actions)": gt("Open in GitHub"),
        "Open in Scira AI(page actions)": gt("Open in Scira AI"),
        "Open(page actions)": gt("Open"),
        "Page Not Found(404 page)": gt("Page Not Found"),
        "Parameters(type table)": gt("Parameters"),
        "Previous Image(image zoom)(aria-label)": gt("Previous Image"),
        "Previous Page(pagination)": gt("Previous Page"),
        "Prop(type table)": gt("Prop"),
        "Read {url}, I want to ask questions about it.(page actions)": gt(
          "Read {url}, I want to ask questions about it.",
          { url: "{url}" },
        ),
        "Returns(type table)": gt("Returns"),
        "Search failed(search dialog)": gt("Search failed"),
        "Search failed, showing results for {query}(search dialog)": gt(
          "Search failed, showing results for {query}",
          { query: "{query}" },
        ),
        "Search(search dialog)": gt("Search"),
        "Search(search trigger)": gt("Search"),
        "Show Sidebar(sidebar)": gt("Show Sidebar"),
        "System(theme switcher)(aria-label)": gt("System"),
        "Table of Contents(inline table of contents)": gt("Table of Contents"),
        "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.(404 page)":
          gt(
            "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.",
          ),
        "Toggle Menu(mobile menu)(aria-label)": gt("Toggle Menu"),
        "Toggle Theme(theme switcher)(aria-label)": gt("Toggle Theme"),
        "Type(type table)": gt("Type"),
        "View as Markdown(page actions)": gt("View as Markdown"),
      },
    });
}
