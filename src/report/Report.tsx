import structuredClone from '@ungap/structured-clone';
import { nanoid } from 'nanoid';
import { useState } from 'react';
// import { assertObject } from 'renegade-js';
import { version } from '../../package.json';
import { EventSimple, MatchSimple, TeamSimple } from '../api/types';
import { Flow, FlowState } from '../flow/Flow';
import { FlowSchema } from '../flow/FlowSchema';
import { Model2023 } from '../Model2023';
import { Setup } from '../setup/Setup';
import { Status } from '../status/Status';
import { ViewEvent } from '../view/View';
import { ReportState } from './ReportState';
import { useLocalStorage } from './useLocalStorage';

import * as styles from './Report.module.scss';

const processEvents = (events: ViewEvent[]) => {
	// const payloadKeys = new Set<string>();
	// for (const event of events) {
	// 	if (event.payload !== null) {
	// 		assertObject(event.payload);
	// 		for (const key in event.payload) payloadKeys.add(key);
	// 	}
	// }

	const processedEvents: ViewEvent[] = [];

	let ampAuton = 0;
	let speakerAuton = 0;
	let ampTeleop = 0;
	let speakerTeleop = 0;
	let trap = 0;
	let hung = false;

	for (const event of events) {
		const processedEvent: ViewEvent = {
			id: event.id,
			phase: event.phase,
			// time: event.time,
			// payload: {}
		};

		if (event.id === "amp" && event.phase === "auton")
			ampAuton++;
		else if (event.id === "speaker" && event.phase === "auton")
			speakerAuton++;
		else if (event.id === "amp" && event.phase === "teleop")
			ampTeleop++;
		else if (event.id === "speaker" && event.phase === "teleop")
			speakerTeleop++;
		else if (event.id === "trap")
			trap++;
		else if (event.id === "hung")
			hung = true;

		// if (event.payload !== null) {
		// 	assertObject(event.payload);
		// 	for (const key of payloadKeys) {
		// 		processedEvent.payload![key] = event.payload[key] || null;
		// 	}
		// } else {
		// 	for (const key of payloadKeys) {
		// 		processedEvent.payload![key] = null;
		// 	}
		// }

		processedEvents.push(processedEvent);
	}

	processedEvents.reverse();

	return [{ 'ampAuton': ampAuton, 'speakerAuton': speakerAuton, 'ampTeleop': ampTeleop, 'speakerTeleop': speakerTeleop, 'trap': trap, 'hung': hung }, processedEvents];
};

export const Report: React.FC = () => {
	const [state, setState] = useState<'setup' | 'active'>('setup');
	const [flow, setFlow] = useState<FlowSchema>();

	// persist chosen year and event in localstorage so they don't need to be picked repeatedly
	const [initialEvent, setInitialEvent] = useLocalStorage<EventSimple>('initialEvent', {
		city: 'San Francisco',
		country: 'USA',
		end_date: '2022-03-20',
		event_code: 'casf',
		event_type: 0,
		key: '2022casf',
		name: 'San Francisco Regional',
		start_date: '2022-03-17',
		state_prov: 'CA',
		year: 2022
	});
	const [initialYear, setInitialYear] = useLocalStorage('initialYear', initialEvent.year);

	// manage setup state so cancelling a report doesn't feel awful
	const [year, setYear] = useState(initialYear);
	const [event, setEvent] = useState<EventSimple | null>(initialEvent);
	const [match, setMatch] = useState<MatchSimple | null>(null);
	const [team, setTeam] = useState<TeamSimple | null>(null);

	// TODO: remove after competition
	if (localStorage.getItem('reports') === '{}') localStorage.setItem('reports', '[]');

	const [reports, setReports] = useLocalStorage<ReportState[]>('reports', []);

	const onFlowStart = (flow: FlowSchema) => {
		setFlow(flow);
		setState('active');

		setInitialYear(year);
		setInitialEvent(event!);
	};

	const onFlowSubmit = (state: FlowState) => {
		const report: Partial<ReportState> & FlowState = structuredClone(state);
		setState('setup');

		report.id = nanoid();
		report.appVersion = version;
		report.modelId = Model2023.id;
		report.modelVersion = Model2023.version;
		report.flowId = flow?.id;

		report.year = year;
		report.eventId = event ? event?.key : null;
		report.matchId = match ? match?.key : null;
		report.teamId = team ? team?.key : null;

		// if the following set of lines have any errors, you should probably Just Ignore It
		report.events = processEvents(report.events!)[1];
		report.ampAuton = processEvents(report.events!)[0]['ampAuton']
		report.speakerAuton = processEvents(report.events!)[0]['speakerAuton']
		report.ampTeleop = processEvents(report.events!)[0]['ampTeleop']
		report.speakerTeleop = processEvents(report.events!)[0]['speakerTeleop']
		report.trap = processEvents(report.events!)[0]['trap']
		report.hung = processEvents(report.events!)[0]['hung']

		setReports([...reports, report as ReportState]);
	};

	const onFlowExit = () => {
		setState('setup');
	};

	return (
		<div className={styles.report}>
			<div>
				<Status reports={reports} setReports={setReports} />
				{state === 'setup' ? (
					<Setup
						year={year}
						setYear={setYear}
						event={event}
						setEvent={setEvent}
						match={match}
						setMatch={setMatch}
						team={team}
						setTeam={setTeam}
						onFlowStart={onFlowStart}
						model={Model2023}
					/>
				) : null}
				{state === 'active' ? (
					<Flow
						flow={flow!}
						onSubmit={onFlowSubmit}
						onExit={onFlowExit}
						team={team}
						match={match}
					/>
				) : null}
			</div>
		</div>
	);
};
