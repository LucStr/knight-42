"use client";

export enum PlaybackType {
  PLAY = "PLAY",
  PAUSE = "PAUSE",
  LIVE = "LIVE",
}

import { EventStatus } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getNetworkMapEvents } from "./network-actions";

const NetworkMapContext = createContext<NetworkMapContextType | undefined>(
  undefined
);

type NetworkMapContextType = {
  datetime: Date;
  timelineStart: Date;
  timelineEnd: Date;
  playSpeed: number;
  setPlaySpeed: (speed: number) => void;
  playbackType: PlaybackType;
  setPlaybackType: (type: PlaybackType) => void;
  togglePlay: () => void;
  events: Awaited<ReturnType<typeof getNetworkMapEvents>>;
  setDatetime: (date: Date) => void;
  dynamicEvents: Awaited<ReturnType<typeof getNetworkMapEvents>>;
  getDynamicEventsByAsset: (
    assetId: string
  ) => Awaited<ReturnType<typeof getNetworkMapEvents>>;
  getCurrentAssetStatus: (assetId: string) => EventStatus;
};

export function NetworkMapProvider({
  initialEvents = [],
  children,
}: {
  initialEvents?: Awaited<ReturnType<typeof getNetworkMapEvents>>;
  children: React.ReactNode;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [datetime, setDatetime] = useQueryState("datetime", {
    parse: (value) => new Date(value),
    defaultValue: new Date("Tue Nov 27 2024 07:20:00"),
  });
  const [playSpeed, setPlaySpeed] = useQueryState("playSpeed", {
    parse: (value) => parseInt(value),
    defaultValue: 5,
  });
  const [playbackType, setPlaybackType] = useQueryState("playbackType", {
    parse: (value) => value as PlaybackType,
    defaultValue: PlaybackType.LIVE,
  });

  // if playback type is live, then set interval to 30 sec to refetch all events and update the datetime
  const { data: newEvents, refetch } = useQuery({
    queryKey: ["network-map-events-dynamic"],
    queryFn: () => getNetworkMapEvents(),
  });

  useEffect(() => {
    refetch();
  }, []);
  // if playback type is live set interval 5 sec and console log live
  useEffect(() => {
    if (playbackType === PlaybackType.LIVE) {
      const intervalId = setInterval(() => {
        refetch();
        setDatetime(new Date());
      }, 5000);
      return () => clearInterval(intervalId);
    }
  }, [playbackType]);

  useEffect(() => {
    if (newEvents) {
      console.log("newEvents", newEvents);
      setEvents(newEvents);
    }
  }, [newEvents]);

  const togglePlay = useCallback(() => {
    setPlaybackType((prev) => {
      if (prev !== PlaybackType.PAUSE) {
        return PlaybackType.PAUSE;
      }
      return PlaybackType.PLAY;
    });
  }, [playbackType, setPlaybackType]);

  const getDynamicEventsByAsset = useCallback(
    (assetId: string) => {
      return events.filter(
        (event) =>
          event.asset?.id === assetId && new Date(event.createdAt) <= datetime
      );
    },
    [events, datetime]
  );

  const dynamicEvents = useMemo(() => {
    return events.filter((event) => new Date(event.createdAt) <= datetime);
  }, [events, datetime]);

  const getCurrentAssetStatus = useCallback(
    (assetId: string) => {
      return (
        getDynamicEventsByAsset(assetId)
          .filter((e) => e.status != null)
          .at(-1)?.status ?? EventStatus.OKAY
      );
    },
    [getDynamicEventsByAsset]
  );

  const timelineStart = useMemo(() => {
    const start = new Date(events.at(0)?.createdAt ?? new Date());
    start.setHours(0, 0, 0, 0);
    return start;
  }, [events, datetime]);

  const [timelineEnd, setTimelineEnd] = useState<Date>(new Date());

  useEffect(() => {
    // update timeline end to be the now every sec
    const intervalId = setInterval(() => {
      setTimelineEnd(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (playbackType === PlaybackType.PLAY) {
      intervalId = setInterval(() => {
        setDatetime((prevDate) => {
          const newDate = new Date(prevDate);
          newDate.setMinutes(newDate.getMinutes() + playSpeed);
          if (timelineEnd && newDate > timelineEnd) {
            setPlaybackType(PlaybackType.LIVE);
            return timelineEnd;
          }
          return newDate;
        });
      }, 1000); // Update every second
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [playbackType, timelineEnd, playSpeed]);

  return (
    <NetworkMapContext.Provider
      value={{
        datetime,
        timelineStart,
        timelineEnd,
        playSpeed,
        setPlaySpeed,
        playbackType,
        togglePlay,
        events,
        setDatetime,
        getDynamicEventsByAsset: getDynamicEventsByAsset,
        getCurrentAssetStatus,
        dynamicEvents,
        setPlaybackType,
      }}
    >
      {children}
    </NetworkMapContext.Provider>
  );
}

export function useNetworkMap() {
  const context = useContext(NetworkMapContext);
  if (context === undefined) {
    throw new Error("useNetworkMap must be used within a NetworkMapProvider");
  }
  return context;
}