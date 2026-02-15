export class ChatUtils {
    static getUserRoom(userId: string): string {
        return `user_room_${userId}`;
    }

    static getGroupRoom(groupId: string): string {
        return `group_${groupId}`;
    }
}
