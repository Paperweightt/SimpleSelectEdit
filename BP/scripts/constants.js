export const PACK_ID = "sse"

export const TYPE_IDS = {
    ARROW: PACK_ID + ":arrow",
    CORE: PACK_ID + ":core",
    LINE: PACK_ID + ":line",
    ITEM_DISPLAY: PACK_ID + ":item_display",
    BACK_PANEL: PACK_ID + ":back_panel",
    SELECT_ITEM: PACK_ID + ":selector",
    DELETE_ITEM: PACK_ID + ":deleter",
    UNDO_ITEM: PACK_ID + ":undo",
    BLUEPRINT_ITEM: PACK_ID + ":blueprint",
    GIZMO: PACK_ID + ":rotate_gizmo",
    TICKING_ENTITY: PACK_ID + ":ticking_area",
    PANEL: PACK_ID + ":panel",
}

export const EXCLUDE_ENTITY_TYPES = [
    TYPE_IDS.ARROW,
    TYPE_IDS.CORE,
    TYPE_IDS.BACK_PANEL,
    TYPE_IDS.TICKING_ENTITY,
    TYPE_IDS.ITEM_DISPLAY,
    TYPE_IDS.PANEL,
    TYPE_IDS.GIZMO,
]

export const USE_DURATION = {
    SELECT_ITEM: 2_000_000_000,
}

export const BLOCK_PARTICLE = {
    BASIC: {
        x: PACK_ID + ":face_x",
        y: PACK_ID + ":face_y",
        z: PACK_ID + ":face_z",
    },
}

export const ANIMATIONS = {
    END: "animation.end",
    BACK_PANEL: "animation.back_panel",
}

export const PROPERTIES = {
    AXIS: PACK_ID + ":axis",
    HEAD_X_ROTATION: PACK_ID + ":rotate_head_x",
    HEAD_Y_ROTATION: PACK_ID + ":rotate_head_y",
    HEAD_X_SIZE: PACK_ID + ":size_head_x",
    HEAD_Y_SIZE: PACK_ID + ":size_head_y",
}

export const CONFIG = {
    MAX_SELECTION_DISTANCE: 100,
}

export const PATHS = {}
