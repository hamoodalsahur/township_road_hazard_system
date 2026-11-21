"use client";

import { createContext } from "react";

/**
 * Where the navy page header goes. ManagementShell renders an empty element under the top bar and
 * shares it here; ManagementSectionHeading portals the page's title, summary and actions into it,
 * so the band can run full width while each page still owns its own header content.
 */
export const HeaderSlotContext = createContext<{ inShell: boolean; slot: HTMLElement | null }>({ inShell: false, slot: null });
