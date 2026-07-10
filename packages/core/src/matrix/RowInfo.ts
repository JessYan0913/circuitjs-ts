import { RowType, type RowInfo } from '@circuitjs/shared';

export function createRowInfo(): RowInfo {
    return {
        type: RowType.ROW_NORMAL,
        value: 0,
        dropRow: false,
        rsChanges: false,
        lsChanges: false,
        mapRow: 0,
        mapCol: 0,
    };
}
